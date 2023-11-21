import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Producto } from 'src/app/models/producto';
import { ProductoService } from 'src/app/services/producto.service';
import Swal from 'sweetalert2';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { Chart, registerables } from 'chart.js/auto'; 
Chart.register(...registerables); 

(<any>pdfMake).vfs = pdfFonts.pdfMake.vfs;

@Component({
  selector: 'app-listar-productos',
  templateUrl: './listar-productos.component.html',
  styleUrls: ['./listar-productos.component.css']
})
export class ListarProductosComponent implements OnInit, AfterViewInit {

  listProductos: Producto[] = [];
  elementos: number = 0;
  totalMontos: number = 0;
  productoMasCaro: Producto | null = null;

  @ViewChild('chartCanvas') chartCanvas: ElementRef | undefined;

  constructor(private _productoService: ProductoService) { }

  ngOnInit(): void {
    this.obtenerProductos();
  }

  ngAfterViewInit(): void {

    this.generarGraficoCanvas();
  }

  obtenerProductos() {
    this._productoService.getProductos().subscribe(data => {
      console.log(data);
      this.listProductos = data;
      this.elementos = this.listProductos.length;
      this.calcularTotalMontos();
      this.calcularProductoMasCaro();
    });
  }
  eliminarProducto(id: any){
    this._productoService.deleteProducto(id).subscribe(data => {

      Swal.fire({
        title: 'Eliminacion de Producto',
        text: "¿Desea eliminar el producto?",
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Aceptar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          console.log(data);
          this.obtenerProductos();
          this.elementos = this.listProductos.length;
        }
      })
    })
  }
  calcularTotalMontos() {
    this.totalMontos = this.listProductos.reduce((total, producto) => total + producto.precio, 0);
  }

  calcularProductoMasCaro() {
    this.productoMasCaro = this.listProductos.reduce((productoMasCaro: Producto | null, producto) =>
      (!productoMasCaro || producto.precio > productoMasCaro.precio) ? producto : productoMasCaro, null);
  }

  generarReporteTabular() {
    const datosParaReporte = this.listProductos.map(producto => {
      return [producto.producto, producto.categoria, producto.ubicacion, producto.precio];
    });

    const pdfDefinition: any = {
      content: [
        { text: 'Informe Tabular de Productos', fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', '*'],
            body: [
              [{ text: 'Producto', bold: true }, { text: 'Categoría', bold: true }, { text: 'Ubicación', bold: true }, { text: 'Precio', bold: true }],
              ...datosParaReporte
            ]
          }
        },
        { text: 'Total de Productos: ' + this.elementos, margin: [0, 20, 0, 20] },
        { text: 'Total de Montos: ' + this.totalMontos.toFixed(2), margin: [0, 0, 0, 20] },
        { text: 'Fecha del Informe: ' + new Date().toLocaleDateString(), margin: [0, 0, 0, 20] },
        { text: 'Producto más caro: ' + (this.productoMasCaro ? this.productoMasCaro.producto : 'N/A'), margin: [0, 0, 0, 20] },
      ]
    };

    pdfMake.createPdf(pdfDefinition).open();
  }

  private generarGraficoCanvas(): void {
    if (!this.chartCanvas || !this.chartCanvas.nativeElement) {
      console.error('No se puede obtener el contexto 2D del canvas.');
      return;
    }

    const canvas = this.chartCanvas.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('No se puede obtener el contexto 2D del canvas.');
      return;
    }

    Chart.getChart(context)?.destroy();

    const chart = new Chart(context, {
      type: 'bar',
      data: {
        labels: Object.keys(this.agruparPorCategoria(this.listProductos)),
        datasets: [{
          label: 'Cantidad de Productos',
          data: Object.values(this.agruparPorCategoria(this.listProductos)).map(categoria => categoria.length),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });

    const imageDataUrl = canvas.toDataURL();
    this.agregarImagenAlPdf(imageDataUrl);
  }

  agregarImagenAlPdf(imagenDataUrl: string): void {
    const datosParaReporte = this.listProductos.map(producto => {
      return [producto.producto, producto.categoria, producto.ubicacion, producto.precio];
    });

    const pdfDefinition: any = {
      content: [
        { text: 'Reporte de Productos', fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', '*'],
            body: [
              [{ text: 'Producto', bold: true }, { text: 'Categoría', bold: true }, { text: 'Ubicación', bold: true }, { text: 'Precio', bold: true }],
              ...datosParaReporte
            ]
          }
        },
        { text: 'Total de Productos: ' + this.elementos, margin: [0, 20, 0, 20] },
        { text: 'Fecha del Reporte: ' + new Date().toLocaleDateString(), margin: [0, 0, 0, 20] },
        { image: imagenDataUrl, width: 500, alignment: 'center', margin: [0, 20, 0, 20] },
      ]
    };

    pdfMake.createPdf(pdfDefinition).open();
  }

  private agruparPorCategoria(productos: Producto[]): { [categoria: string]: Producto[] } {
    return productos.reduce((agrupado, producto) => {
      agrupado[producto.categoria] = agrupado[producto.categoria] || [];
      agrupado[producto.categoria].push(producto);
      return agrupado;
    }, {} as { [categoria: string]: Producto[] });
  }

  generarInformeGrafico() {
    console.log('Generando informe gráfico...');
    this.generarGraficoCanvas();
  
    setTimeout(() => {
      this.crearPdfConInformeGrafico();
    }, 500);
  
    Swal.fire({
      title: 'Informe Gráfico Generado',
      text: 'Se ha generado el informe gráfico.',
      icon: 'success',
      confirmButtonText: 'Aceptar'
    });
  }
  
  private crearPdfConInformeGrafico() {
    const canvas = this.chartCanvas?.nativeElement;
    const imageDataUrl = canvas.toDataURL();
  
    const datosParaReporte = this.listProductos.map(producto => {
      return [producto.producto, producto.categoria, producto.ubicacion, producto.precio];
    });
  
    const pdfDefinition: any = {
      content: [
        { text: 'Reporte de Productos', fontSize: 18, bold: true, alignment: 'center', margin: [0, 0, 0, 20] },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', '*'],
            body: [
              [{ text: 'Producto', bold: true }, { text: 'Categoría', bold: true }, { text: 'Ubicación', bold: true }, { text: 'Precio', bold: true }],
              ...datosParaReporte
            ]
          }
        },
        { text: 'Total de Productos: ' + this.elementos, margin: [0, 20, 0, 10] },
        { text: 'Total de Montos: ' + this.totalMontos.toFixed(2), margin: [0, 0, 0, 10] },
        { text: 'Fecha del Informe: ' + new Date().toLocaleDateString(), margin: [0, 0, 0, 10] },
        { text: 'Producto más caro: ' + this.productoMasCaro, margin: [0, 20, 0, 20] },
        { image: imageDataUrl, width: 500, alignment: 'center', margin: [0, 20, 0, 20] },
      ]
    };
  
    pdfMake.createPdf(pdfDefinition).download('Informe_Productos.pdf');
  }
}
